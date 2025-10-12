export function getSubjectForDay(day: number, type: string): string {
  const subjects: Record<string, string[]> = {
    nurture: [
      'Welcome to our community',
      "Here's what you need to know",
      'Success stories from our users',
      'Tips to get the most value',
      'Your progress so far',
      'Advanced features unlocked',
      'Join our upcoming webinar',
    ],
    onboarding: [
      'Welcome aboard!',
      'Getting started guide',
      'Your first steps',
      'Pro tips for success',
      'Meet your dashboard',
      'Advanced features',
      "You're all set!",
    ],
    promotional: [
      'Special offer inside',
      'Limited time discount',
      'Exclusive deal for you',
      'Last chance to save',
      'New features released',
      'Premium upgrade available',
      'Final reminder',
    ],
    educational: [
      'Lesson 1: Getting Started',
      'Lesson 2: Core Concepts',
      'Lesson 3: Advanced Techniques',
      'Lesson 4: Best Practices',
      'Lesson 5: Case Studies',
      'Lesson 6: Expert Tips',
      'Lesson 7: Mastery',
    ],
    're-engagement': [
      'We miss you!',
      "Here's what you've missed",
      'Special comeback offer',
      'Your account is waiting',
      "New features you'll love",
      'One last chance',
      "We'd love your feedback",
    ],
  }

  const typeSubjects = subjects[type] || subjects.nurture
  return typeSubjects[Math.min(day - 1, typeSubjects.length - 1)]
}

export function getPreviewForDay(day: number, type: string): string {
  return `This is email ${day} of your ${type} campaign. Click to edit and customize the content.`
}

export function getContentForDay(
  day: number,
  type: string,
  tone: string
): string {
  return `# Welcome to Day ${day}

Hi there,

This is **Day ${day}** of your ${type} campaign with a ${tone} tone.

## What's Inside

Your personalized content will appear here based on your landing page analysis. This email is designed to engage your audience and drive action.

### Key Points

• Engaging introduction that captures attention
• Clear value proposition that resonates
• Compelling call-to-action that converts
• Social proof and testimonials for credibility

## Next Steps

We're excited to help you achieve your goals. Click the button below to get started.

Best regards,  
**Your Team**`
}
