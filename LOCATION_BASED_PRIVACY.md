# IP-Based Privacy Compliance

This document explains how the waitlist landing page automatically adapts privacy controls based on user IP geolocation.

## Overview

The system detects whether users are in the EU (requiring GDPR compliance) or US (requiring CCPA compliance) and shows appropriate privacy controls accordingly.

## How It Works

### 1. IP Geolocation Detection

- **Method**: Vercel's built-in geolocation headers (`x-vercel-ip-country`)
- **Privacy-Friendly**: Uses Vercel's Edge Network, no external API calls
- **Fast**: Headers are already available, no additional requests
- **Default**: Assumes US location if detection fails (simpler experience)

### 2. Privacy Controls by Region

#### US Users (CCPA Required)

- ❌ **No privacy consent checkbox** - Not required under CCPA
- ❌ **No marketing consent checkbox** - Not required under CCPA
- ❌ **No cookie consent banner** - Not required under CCPA
- ✅ **Simple privacy notice** - Basic notice about data collection
- ✅ **Unsubscribe option** - Right to delete data

#### Other Users (GDPR Required - includes EU and rest of world)

- ✅ **Privacy consent checkbox** - Required to join waitlist
- ✅ **Marketing consent checkbox** - Optional for additional communications
- ✅ **Cookie consent banner** - Required for cookie usage
- ✅ **Consent timestamp tracking** - Records when consent was given
- ✅ **Detailed privacy notices** - Links to privacy policy and terms

### 3. Database Tracking

The system tracks:

- `user_region`: 'EU', 'US', or 'OTHER'
- `privacy_consent`: Boolean (true for US, user choice for EU)
- `marketing_consent`: Boolean (false for US, user choice for EU)
- `consent_timestamp`: When consent was given
- `country_code`: Detected country code from IP

## Implementation Details

### IP Detection Utility

```typescript
// lib/utils/location-detection.ts
export function useRegionDetection() {
  // Returns region info and loading state
  // Automatically detects EU vs US vs OTHER from IP geolocation
}
```

### Conditional Rendering

```typescript
// Only show GDPR consent for EU users
{
  !isLoading && locationInfo?.requiresGDPR && <PrivacyConsentSection />
}

// Only show cookie banner for EU users
{
  locationInfo?.requiresGDPR && <CookieConsentBanner />
}
```

### API Handling

```typescript
// API automatically handles different regions
{
  privacyConsent: locationInfo?.requiresGDPR ? privacyConsent : true,
  marketingConsent: locationInfo?.requiresGDPR ? marketingConsent : false,
  userRegion: locationInfo?.region || 'OTHER'
}
```

## Benefits

1. **Compliance**: Automatically meets GDPR and CCPA requirements
2. **User Experience**: US users see simpler forms without unnecessary checkboxes
3. **Conversion**: Reduces friction for US users while maintaining EU compliance
4. **Future-Proof**: Easy to add new regions as privacy laws evolve

## Testing

### US User Experience

- IP detected from US
- Should NOT see privacy consent checkboxes
- Should NOT see cookie consent banner
- Form submits without consent requirements

### Other User Experience (includes EU and rest of world)

- IP detected from any non-US country (including EU countries like DE, FR, IT, etc.)
- Should see privacy consent checkboxes
- Should see cookie consent banner
- Form requires privacy consent to submit

### Fallback Behavior

- If IP detection fails, defaults to US (simpler experience)
- Users can manually override region selection
- All users can still access privacy policy and unsubscribe

## Legal Compliance

- **CCPA**: Full compliance for US users with notice and opt-out
- **GDPR**: Full compliance for all other users (including EU) with explicit consent

## Maintenance

- Update EU country list if EU membership changes
- Add new countries to CCPA list as US states pass privacy laws
- Monitor for new international privacy regulations
- Test IP detection periodically
- Country mappings are easily editable in `/api/detect-region/route.ts`
