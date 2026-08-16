'use client';

// Turns the URLs inside a chat message into real links, for both sides of the
// conversation: the visitor's panel and the admin inbox.
//
// Splitting the text and rendering the pieces, rather than building HTML and
// using dangerouslySetInnerHTML: message bodies are written by visitors, so
// they must never be able to inject markup.

// split() keeps the capture group, so the URLs come back as their own pieces.
// The check below is a fresh, unflagged regex on purpose: /g regexes carry a
// lastIndex between .test() calls and would skip every other match.
const SPLIT_URL = /(https?:\/\/[^\s<]+)/g;
const IS_URL = /^https?:\/\//;

export default function Linkify({ text }) {
  return text.split(SPLIT_URL).map((part, i) => (
    IS_URL.test(part)
      // trailing punctuation belongs to the sentence, not to the address
      ? <Anchor key={i} href={part.replace(/[.,;:!?)\]]+$/, '')} raw={part} />
      : part
  ));
}

function Anchor({ href, raw }) {
  const tail = raw.slice(href.length);
  return (
    <>
      <a href={href} target="_blank" rel="noreferrer">{href}</a>
      {tail}
    </>
  );
}
