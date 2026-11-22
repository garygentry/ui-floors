export function App() {
  return (
    <main className="transition-all bg-[#ff0000]">
      <span className="break-all">ID</span>
      <span style={{ color: "rgb(1 2 3)" }}>Text</span>
      <span className="md:break-all [&>b]:transition-all">Variants</span>
    </main>
  );
}
