export default function Button98({ children, variant, ...props }) {
  const cls = ['btn98', variant].filter(Boolean).join(' ');
  return (
    <button type="button" className={cls} {...props}>
      {children}
    </button>
  );
}
