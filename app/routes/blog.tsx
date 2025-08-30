import { Layout } from "../components/Layout";

export function meta() {
  return [
    { title: "OSKey" },
    { name: "description", content: "OSKey Hardware Wallet Test Page" },
  ];
}

export default function Test() {
  return (
    <Layout>
      <div
        style={{
          padding: "12px",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <div
          onClick={() => (window.location.href = "/blog/what-is-oskey")}
          style={{
            border: "1px solid #e0e0e0",
            borderRadius: "12px",
            padding: "20px",
            margin: "0 auto",
            maxWidth: "800px",
            backgroundColor: "#fff",
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
            cursor: "pointer",
            transition: "all 0.2s ease",
            transform: "translateY(0)",
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.12)";
            e.currentTarget.style.transform = "translateY(-2px)";
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)";
            e.currentTarget.style.transform = "translateY(0)";
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.08)";
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.12)";
            e.currentTarget.style.transform = "translateY(-2px)";
          }}
        >
          <h2
            style={{
              margin: "0 0 12px 0",
              fontSize: "20px",
              fontWeight: "600",
              color: "#1a1a1a",
            }}
          >
            What is OSKey?
          </h2>
          <p
            style={{
              margin: "0 0 16px 0",
              color: "#666",
              fontSize: "16px",
              lineHeight: "1.5",
            }}
          >
            We are building core infrastructure connecting digital world with
            real world. Not just a hardware wallet.
          </p>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "8px",
            }}
          >
            <span
              style={{
                color: "#888",
                fontSize: "14px",
              }}
            >
              2025-08-30
            </span>
            <span
              style={{
                color: "#888",
                fontSize: "14px",
              }}
            >
              Author: OSKey
            </span>
          </div>
        </div>
      </div>
    </Layout>
  );
}
