/** Enlace wa.me; números de 10 dígitos se asumen de México (+52). */
export function whatsappLink(phone: string, text: string): string {
  const digits = phone.replace(/\D/g, '')
  const full = digits.length === 10 ? `52${digits}` : digits
  return `https://wa.me/${full}?text=${encodeURIComponent(text)}`
}
