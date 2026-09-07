import { redirect } from "next/navigation";

export default async function SituationPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  redirect(`/library?situation=${id}`);
}
