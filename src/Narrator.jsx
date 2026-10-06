export default function Narrator({ line }) {
  return (
    <figure className="narrator" aria-label="Narrator">
      <blockquote>
        <p key={line.main}>{line.main}</p>
        {line.aside && <p className="narrator-aside">{line.aside}</p>}
      </blockquote>
      <figcaption>The Narrator</figcaption>
    </figure>
  )
}
