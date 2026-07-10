package domain

// Article is the output of the Writer — a complete, publish-ready article.
type Article struct {
	Title        string
	Subtitle     string
	BodyMarkdown string
}
