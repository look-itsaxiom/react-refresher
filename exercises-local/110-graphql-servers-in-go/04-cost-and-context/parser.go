package graphcost

import (
	"fmt"
	"strconv"
	"unicode"
)

// ParseSelection parses a restricted selection-set syntax: identifiers,
// integer arguments in parentheses (e.g. "first: 10"), and braces for
// nested selections -- e.g.
// `projects(first: 10) { tasks(first: 20) { assignee { name } } }`.
// It is not a GraphQL parser: no fragments, no variables, no non-integer
// argument values, no string/enum literals.
func ParseSelection(s string) (Field, error) {
	toks, err := tokenize(s)
	if err != nil {
		return Field{}, err
	}
	p := &parser{toks: toks}
	f, err := p.parseField()
	if err != nil {
		return Field{}, err
	}
	if p.peek().kind != tokEOF {
		return Field{}, fmt.Errorf("graphcost: unexpected trailing input %q", p.peek().text)
	}
	return f, nil
}

type tokenKind int

const (
	tokIdent tokenKind = iota
	tokInt
	tokLParen
	tokRParen
	tokLBrace
	tokRBrace
	tokColon
	tokComma
	tokEOF
)

type token struct {
	kind tokenKind
	text string
}

func tokenize(s string) ([]token, error) {
	var toks []token
	i, n := 0, len(s)
	for i < n {
		c := s[i]
		switch {
		case c == ' ' || c == '\t' || c == '\n' || c == '\r':
			i++
		case c == '(':
			toks = append(toks, token{tokLParen, "("})
			i++
		case c == ')':
			toks = append(toks, token{tokRParen, ")"})
			i++
		case c == '{':
			toks = append(toks, token{tokLBrace, "{"})
			i++
		case c == '}':
			toks = append(toks, token{tokRBrace, "}"})
			i++
		case c == ':':
			toks = append(toks, token{tokColon, ":"})
			i++
		case c == ',':
			toks = append(toks, token{tokComma, ","})
			i++
		case unicode.IsDigit(rune(c)):
			j := i
			for j < n && unicode.IsDigit(rune(s[j])) {
				j++
			}
			toks = append(toks, token{tokInt, s[i:j]})
			i = j
		case unicode.IsLetter(rune(c)) || c == '_':
			j := i
			for j < n && (unicode.IsLetter(rune(s[j])) || unicode.IsDigit(rune(s[j])) || s[j] == '_') {
				j++
			}
			toks = append(toks, token{tokIdent, s[i:j]})
			i = j
		default:
			return nil, fmt.Errorf("graphcost: unexpected character %q at position %d", c, i)
		}
	}
	toks = append(toks, token{tokEOF, ""})
	return toks, nil
}

type parser struct {
	toks []token
	pos  int
}

func (p *parser) peek() token { return p.toks[p.pos] }

func (p *parser) next() token {
	t := p.toks[p.pos]
	if p.pos < len(p.toks)-1 {
		p.pos++
	}
	return t
}

func (p *parser) expect(k tokenKind) (token, error) {
	t := p.next()
	if t.kind != k {
		return t, fmt.Errorf("graphcost: unexpected token %q", t.text)
	}
	return t, nil
}

func (p *parser) parseField() (Field, error) {
	name, err := p.expect(tokIdent)
	if err != nil {
		return Field{}, err
	}
	f := Field{Name: name.text}

	if p.peek().kind == tokLParen {
		p.next()
		args, err := p.parseArgs()
		if err != nil {
			return Field{}, err
		}
		f.Args = args
		if _, err := p.expect(tokRParen); err != nil {
			return Field{}, err
		}
	}

	if p.peek().kind == tokLBrace {
		p.next()
		sels, err := p.parseFields()
		if err != nil {
			return Field{}, err
		}
		f.Selections = sels
		if _, err := p.expect(tokRBrace); err != nil {
			return Field{}, err
		}
	}

	return f, nil
}

func (p *parser) parseArgs() (map[string]int, error) {
	args := make(map[string]int)
	for {
		if p.peek().kind == tokRParen {
			return args, nil
		}
		name, err := p.expect(tokIdent)
		if err != nil {
			return nil, err
		}
		if _, err := p.expect(tokColon); err != nil {
			return nil, err
		}
		val, err := p.expect(tokInt)
		if err != nil {
			return nil, err
		}
		n, err := strconv.Atoi(val.text)
		if err != nil {
			return nil, fmt.Errorf("graphcost: invalid integer argument %q: %w", val.text, err)
		}
		args[name.text] = n
		if p.peek().kind == tokComma {
			p.next()
			continue
		}
		return args, nil
	}
}

func (p *parser) parseFields() ([]Field, error) {
	var fields []Field
	for p.peek().kind == tokIdent {
		f, err := p.parseField()
		if err != nil {
			return nil, err
		}
		fields = append(fields, f)
	}
	return fields, nil
}
