import { ReactNode } from "react";
import { Link } from "react-router-dom";

type LayoutProps = {
  title: string;
  children: ReactNode;
};

export default function Layout({ title, children }: LayoutProps) {
  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header__inner">
          <Link to="/" className="app-header__brand">
            Multi-Agent Project Dashboard
          </Link>
          <span className="app-header__badge">MVP0 • Vertical Slice</span>
        </div>
      </header>
      <main className="app-main">
        <h1 className="page-title">{title}</h1>
        {children}
      </main>
    </div>
  );
}
