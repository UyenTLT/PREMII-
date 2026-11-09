import "./style.css";
export const metadata = {
  title: "CGMH PREMII Tracker",
  description: "NICU research and evidence review",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}
