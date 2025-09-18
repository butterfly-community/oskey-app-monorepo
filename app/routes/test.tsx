import { useEffect } from "react";

export function meta() {
  return [
    { title: "Wallet Connect - OSKey" },
    { name: "description", content: "OSKey Hardware Wallet Connect Page" },
  ];
}

export default function Test() {
  useEffect(() => {
    window.location.href = "./settings";
  }, []);

  return null;
}
