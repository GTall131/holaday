import { ADMIN_STATUS_LABELS } from "../data/admin";

export default function AdminStatusChip({ status }){
  return <span className={`admin-status admin-status--${status}`}>{ADMIN_STATUS_LABELS[status]}</span>;
}
