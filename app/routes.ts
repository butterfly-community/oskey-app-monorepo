import { type RouteConfig, index } from "@react-router/dev/routes";

export default [
  index("routes/Index.tsx"),
  { path: "test", file: "routes/test.tsx" },
  { path: "blog", file: "routes/blog.tsx" },
  { path: "settings", file: "routes/settings.tsx" },
  { path: "donate", file: "routes/donate.tsx" },
  { path: "blog/what-is-oskey", file: "routes/who.tsx" },
] satisfies RouteConfig;
