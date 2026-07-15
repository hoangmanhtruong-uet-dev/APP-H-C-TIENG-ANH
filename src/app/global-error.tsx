"use client";

export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="vi">
      <body>
        <style>{`
          button:focus-visible {
            outline: 2px solid #1f4ed8;
            outline-offset: 3px;
          }
        `}</style>
        <main
          style={{
            maxWidth: 640,
            margin: "0 auto",
            padding: "64px 24px",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <h1>Ứng dụng đang gặp sự cố</h1>
          <p>
            Hãy tải lại trang. Không có dữ liệu kỹ thuật nhạy cảm được hiển thị
            tại đây.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{ marginTop: 16, minHeight: 44, padding: "0 18px" }}
          >
            Thử lại
          </button>
        </main>
      </body>
    </html>
  );
}
