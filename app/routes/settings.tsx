import { Layout } from "../components/Layout";
import { TestPage } from "../page/TestPage";

export function meta() {
  return [
    { title: "Settings - OSKey" },
    { name: "description", content: "OSKey Connect Page" },
  ];
}

export default function Test() {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <p className="mb-6 text-sm text-gray-500">
          If you run into issues or need extra context, check the OSKey{" "}
          <a
            className="ml-1 font-medium underline"
            href="https://github.com/butterfly-community/oskey-firmware/blob/master/doc/start/README.md"
            target="_blank"
            rel="noopener noreferrer"
          >
            setup guide
          </a>
          {" "}for detailed steps.
        </p>
        {/* <h1 className="text-3xl font-bold mb-8">Function Test</h1> */}
        <TestPage />
      </div>
    </Layout>
  );
}
