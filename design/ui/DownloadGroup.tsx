export interface DownloadItem {
  href: string;
  label: string;
  detail: string;
}

export function DownloadGroup({ items }: { items: readonly DownloadItem[] }) {
  return (
    <div className="ae-downloads">
      {items.map((item) => (
        <a key={item.href} href={item.href} download>
          <span>
            <strong>{item.label}</strong>
            <small>{item.detail}</small>
          </span>
          <span aria-hidden="true">↓</span>
        </a>
      ))}
    </div>
  );
}
