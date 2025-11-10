import { Layout } from "../components/Layout";
import { Home } from "../components/Home";

export function meta() {
  return [
    { title: "OSKey" },
    {
      name: "description",
      content: "Secure, open-source hardware solution",
    },
  ];
}

export default function Index() {
  return (
    <Layout>
      <Home />
    </Layout>
  );
}
