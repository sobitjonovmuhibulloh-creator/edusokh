import { redirect } from "next/navigation";

// Avtorizatsiya ulanmaguncha bosh sahifa simulyatorga yo'naltiradi
export default function Home() {
  redirect("/simulator");
}
