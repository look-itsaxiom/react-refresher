# Local exercises

Each folder here is a real Go module graded by `go test`. The app runs it for you through the
dev server (`POST /__local-check`), or you can run it yourself:

    cd exercises-local/<lesson>/<step>
    go test ./...                   # your code
    go test -tags solution ./...    # the reference solution (for the validation suite)

Each exercise lives in a single directory using a file-pair convention: `<name>.go` tagged
`//go:build !solution` is the starter you edit, and `<name>_solution.go` tagged
`//go:build solution` is the reference answer, kept out of your normal build by the tag. The
test file (`<name>_test.go`) carries no build tag, so it runs against whichever one is active.

`_smoke/` is a tiny fixture used by the framework tests.
