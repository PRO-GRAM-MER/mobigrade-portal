import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import s from "./pageHeader.module.css";

type Props = {
  backHref: string;
  title: string;
  subtitle?: string;
  /** Extra content on the right side (badges, counts, action buttons) */
  right?: React.ReactNode;
};

export default function PageHeader({ backHref, title, subtitle, right }: Props) {
  return (
    <div className={s.header}>
      <div className={s.left}>
        <Link href={backHref} className={s.backBtn} aria-label="Go back">
          <ArrowLeft size={15} />
        </Link>
        <div className={s.titleGroup}>
          <h1 className={s.title}>{title}</h1>
          {subtitle && <p className={s.subtitle}>{subtitle}</p>}
        </div>
      </div>
      {right && <div className={s.right}>{right}</div>}
    </div>
  );
}
