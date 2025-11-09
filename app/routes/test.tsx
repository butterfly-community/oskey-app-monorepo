import { useEffect } from "react";

export function meta() {
  return [
    { title: "Settings - OSKey" },
    { name: "description", content: "OSKey Connect Page" },
  ];
}

export default function Test() {
  useEffect(() => {
    window.location.href = "./settings";
  }, []);

  return null;
}
