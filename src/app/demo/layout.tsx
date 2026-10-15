import { notFound } from "next/navigation";

// The component demo is a development tool: it answers 404 in production builds.
export default function DemoLayout({ children }: LayoutProps<"/demo">) {
  if (process.env.NODE_ENV === "production") notFound();
  return children;
}
