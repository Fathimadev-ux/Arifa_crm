/** Arifa branding in the Payload admin: the login page logo and the small header mark (same "A" as the CRM). */

const mark = (size: number) => ({
  display: "grid",
  placeItems: "center",
  width: size,
  height: size,
  borderRadius: "9999px",
  background: "#000",
  color: "#fff",
  fontWeight: 700,
  fontSize: size * 0.45,
});

export function Logo() {
  return (
    <span style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
      <span style={mark(56)}>A</span>
      <span style={{ fontSize: 28, fontWeight: 300, letterSpacing: "-0.02em" }}>Arifa CMS</span>
    </span>
  );
}

export function Icon() {
  return <span style={mark(22)}>A</span>;
}
