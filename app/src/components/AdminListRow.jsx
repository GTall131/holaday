import FlagIcon from "./FlagIcon";
import AdminStatusChip from "./AdminStatusChip";

export default function AdminListRow({ flagMarkup, name, sub, status, onClick }){
  return (
    <button className="admin-list-row" onClick={onClick}>
      {flagMarkup ? <FlagIcon markup={flagMarkup} className="admin-list-row__flag" /> : null}
      <span className="admin-list-row__mid">
        <div className="admin-list-row__name">{name}</div>
        {sub ? <div className="admin-list-row__sub">{sub}</div> : null}
      </span>
      {status ? <AdminStatusChip status={status} /> : null}
    </button>
  );
}
