import { state } from "../store";

export default function Toast(){
  return (
    <div className={`toast${state.toastVisible ? " is-visible" : ""}`}>{state.toastMsg}</div>
  );
}
