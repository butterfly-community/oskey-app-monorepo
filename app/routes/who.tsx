import { useEffect } from "react";

export function meta() {
  return [
    { title: "OSKey" },
    { name: "description", content: "OSKey Hardware Wallet Test Page" },
  ];
}

export default function Test() {
  useEffect(() => {
    window.location.href = "https://blog.lastline.tech/archives/873.html";
  }, []);

  return null;
}
