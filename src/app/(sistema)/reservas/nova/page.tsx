import { redirect } from "next/navigation";

export default function NovaReservaPage() {
  redirect("/reservas?nova=1");
}
