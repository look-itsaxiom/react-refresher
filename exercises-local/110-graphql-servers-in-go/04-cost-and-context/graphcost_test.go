package graphcost

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
)

const worked = `projects(first: 10) { tasks(first: 20) { assignee { name } } }`

func TestParseSelectionNested(t *testing.T) {
	f, err := ParseSelection(worked)
	if err != nil {
		t.Fatalf("ParseSelection: %v", err)
	}

	if f.Name != "projects" || f.Args["first"] != 10 {
		t.Fatalf("root = %+v, want projects(first: 10)", f)
	}
	if len(f.Selections) != 1 || f.Selections[0].Name != "tasks" || f.Selections[0].Args["first"] != 20 {
		t.Fatalf("projects.Selections = %+v, want [tasks(first: 20)]", f.Selections)
	}

	assignee := f.Selections[0].Selections
	if len(assignee) != 1 || assignee[0].Name != "assignee" {
		t.Fatalf("tasks.Selections = %+v, want [assignee]", assignee)
	}
	if len(assignee[0].Args) != 0 {
		t.Fatalf("assignee.Args = %+v, want none", assignee[0].Args)
	}

	name := assignee[0].Selections
	if len(name) != 1 || name[0].Name != "name" || len(name[0].Selections) != 0 {
		t.Fatalf("assignee.Selections = %+v, want [name] with no further selections", name)
	}
}

func TestParseSelectionError(t *testing.T) {
	cases := []string{
		`projects(first: 10) {`,                 // unclosed brace
		`projects(first: ) { name }`,            // missing int
		`123projects { name }`,                  // doesn't start with an identifier
		`projects(first: 10) { name } trailing`, // trailing garbage
	}
	for _, s := range cases {
		if _, err := ParseSelection(s); err == nil {
			t.Errorf("ParseSelection(%q): got nil error, want one", s)
		}
	}
}

func TestCostWorkedExample(t *testing.T) {
	f, err := ParseSelection(worked)
	if err != nil {
		t.Fatalf("ParseSelection: %v", err)
	}
	rules := CostRules{Default: 1, ListArg: "first"}

	// name: 1
	// assignee: 1 + 1*1 = 2
	// tasks:    1 + 20*2 = 41
	// projects: 1 + 10*41 = 411
	if got := Cost(f, rules); got != 411 {
		t.Fatalf("Cost(%q) = %d, want 411", worked, got)
	}
}

func TestDepthWorkedExample(t *testing.T) {
	f, err := ParseSelection(worked)
	if err != nil {
		t.Fatalf("ParseSelection: %v", err)
	}
	if got := Depth(f); got != 4 {
		t.Fatalf("Depth(%q) = %d, want 4 (projects/tasks/assignee/name)", worked, got)
	}
}

func TestEnforce(t *testing.T) {
	f, err := ParseSelection(worked)
	if err != nil {
		t.Fatalf("ParseSelection: %v", err)
	}
	rules := CostRules{Default: 1, ListArg: "first"}

	t.Run("within limits", func(t *testing.T) {
		if err := Enforce(f, rules, 1000, 10); err != nil {
			t.Fatalf("Enforce: got %v, want nil", err)
		}
	})

	t.Run("cost exceeded", func(t *testing.T) {
		err := Enforce(f, rules, 100, 10)
		if err == nil {
			t.Fatal("Enforce: got nil, want a cost LimitError")
		}
		var limitErr *LimitError
		if !errors.As(err, &limitErr) {
			t.Fatalf("errors.As(%v, *LimitError) = false", err)
		}
		if limitErr.Kind != "cost" || limitErr.Have != 411 || limitErr.Max != 100 {
			t.Fatalf("limitErr = %+v, want {Kind: cost, Have: 411, Max: 100}", limitErr)
		}
	})

	t.Run("depth exceeded", func(t *testing.T) {
		err := Enforce(f, rules, 100000, 2)
		if err == nil {
			t.Fatal("Enforce: got nil, want a depth LimitError")
		}
		var limitErr *LimitError
		if !errors.As(err, &limitErr) {
			t.Fatalf("errors.As(%v, *LimitError) = false", err)
		}
		if limitErr.Kind != "depth" || limitErr.Have != 4 || limitErr.Max != 2 {
			t.Fatalf("limitErr = %+v, want {Kind: depth, Have: 4, Max: 2}", limitErr)
		}
	})
}

func TestPrincipalRoundTrip(t *testing.T) {
	if _, ok := PrincipalFrom(context.Background()); ok {
		t.Fatal("PrincipalFrom(background) = ok, want false")
	}

	p := Principal{UserID: "u1", OrgID: "org-1", Roles: []string{"admin"}}
	ctx := WithPrincipal(context.Background(), p)

	got, ok := PrincipalFrom(ctx)
	if !ok {
		t.Fatal("PrincipalFrom(ctx) = false, want true")
	}
	if got.UserID != p.UserID || got.OrgID != p.OrgID || len(got.Roles) != len(p.Roles) || got.Roles[0] != p.Roles[0] {
		t.Fatalf("PrincipalFrom(ctx) = %+v, want %+v", got, p)
	}
}

func TestRequireRole(t *testing.T) {
	t.Run("no principal", func(t *testing.T) {
		if err := RequireRole(context.Background(), "admin"); !errors.Is(err, ErrUnauthorized) {
			t.Fatalf("RequireRole = %v, want ErrUnauthorized", err)
		}
	})

	t.Run("missing role", func(t *testing.T) {
		ctx := WithPrincipal(context.Background(), Principal{UserID: "u1", Roles: []string{"member"}})
		if err := RequireRole(ctx, "admin"); !errors.Is(err, ErrForbidden) {
			t.Fatalf("RequireRole = %v, want ErrForbidden", err)
		}
	})

	t.Run("has role", func(t *testing.T) {
		ctx := WithPrincipal(context.Background(), Principal{UserID: "u1", Roles: []string{"member", "admin"}})
		if err := RequireRole(ctx, "admin"); err != nil {
			t.Fatalf("RequireRole = %v, want nil", err)
		}
	})
}

func TestAuthenticateMiddleware(t *testing.T) {
	lookup := func(token string) (Principal, bool) {
		if token != "good-token" {
			return Principal{}, false
		}
		return Principal{UserID: "u1", OrgID: "org-1", Roles: []string{"admin"}}, true
	}

	var sawPrincipal Principal
	var sawOK bool
	inner := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		sawPrincipal, sawOK = PrincipalFrom(r.Context())
		w.WriteHeader(http.StatusOK)
	})
	handler := Authenticate(lookup)(inner)

	t.Run("missing token rejected", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/", nil)
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)
		if rec.Code != http.StatusUnauthorized {
			t.Fatalf("status = %d, want 401", rec.Code)
		}
	})

	t.Run("unknown token rejected", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/", nil)
		req.Header.Set("Authorization", "Bearer bad-token")
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)
		if rec.Code != http.StatusUnauthorized {
			t.Fatalf("status = %d, want 401", rec.Code)
		}
	})

	t.Run("valid token passes through with principal visible", func(t *testing.T) {
		sawOK = false
		req := httptest.NewRequest(http.MethodGet, "/", nil)
		req.Header.Set("Authorization", "Bearer good-token")
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("status = %d, want 200", rec.Code)
		}
		if !sawOK {
			t.Fatal("inner handler: PrincipalFrom(ctx) ok = false, want true")
		}
		want := Principal{UserID: "u1", OrgID: "org-1", Roles: []string{"admin"}}
		if sawPrincipal.UserID != want.UserID || sawPrincipal.OrgID != want.OrgID {
			t.Fatalf("inner handler saw principal %+v, want %+v", sawPrincipal, want)
		}
	})
}
