// Gera um arquivo .vcf (vCard) do lead e dispara o download.
// No celular, abrir esse arquivo oferece direto a opção "Adicionar aos contatos"
// (tanto no iOS quanto no Android), sem precisar de nenhuma permissão especial do navegador.
export function downloadLeadVCard(lead) {
  const phone = (lead.phone || "").replace(/[^\d+]/g, "");
  const phone2 = (lead.phone2 || "").replace(/[^\d+]/g, "");

  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${lead.name}`,
    `N:${lead.name};;;;`,
  ];

  if (phone) lines.push(`TEL;TYPE=CELL:${phone}`);
  if (phone2) lines.push(`TEL;TYPE=HOME:${phone2}`);
  if (lead.email) lines.push(`EMAIL:${lead.email}`);
  if (lead.interest) lines.push(`NOTE:Interesse: ${lead.interest}`);
  lines.push("END:VCARD");

  const blob = new Blob([lines.join("\r\n")], { type: "text/vcard;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${lead.name.replace(/[^\w\s-]/g, "")}.vcf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
