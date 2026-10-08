import { redirect } from 'next/navigation'

// The product is live; this pre-launch waitlist page now just sends people home.
export default function ComingSoonPage() {
  redirect('/')
}
