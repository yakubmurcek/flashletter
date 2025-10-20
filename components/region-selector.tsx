'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Globe, Shield, Check } from 'lucide-react'
import { useRegionDetection } from '@/lib/utils/location-detection'

interface RegionSelectorProps {
  className?: string
}

export function RegionSelector({ className = '' }: RegionSelectorProps) {
  const { locationInfo, updateRegion } = useRegionDetection()
  const [showSelector, setShowSelector] = useState(false)

  if (!showSelector) {
    return (
      <div className={`text-center ${className}`}>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowSelector(true)}
          className="flex items-center gap-2"
        >
          <Globe className="w-4 h-4" />
          {locationInfo?.region === 'US' ? 'US (CCPA)' : 'Other (GDPR)'}
        </Button>
        <p className="text-xs text-muted-foreground mt-2">
          IP-detected • Click to change
        </p>
        <p className="text-xs text-muted-foreground">
          Debug: {locationInfo?.countryCode || 'Unknown'}
        </p>
      </div>
    )
  }

  return (
    <Card className={`max-w-md mx-auto ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Shield className="w-5 h-5" />
          Choose Your Region
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          We detected your region from your IP address. You can change it here
          if needed.
        </p>

        <div className="space-y-3">
          <Button
            variant={locationInfo?.region === 'US' ? 'default' : 'outline'}
            className="w-full justify-start"
            onClick={() => {
              updateRegion('US')
              setShowSelector(false)
            }}
          >
            <div className="flex items-center gap-3">
              {locationInfo?.region === 'US' && <Check className="w-4 h-4" />}
              <div className="text-left">
                <div className="font-medium">United States (CCPA)</div>
                <div className="text-xs text-muted-foreground">
                  Simplified privacy controls
                </div>
              </div>
            </div>
          </Button>

          <Button
            variant={locationInfo?.region === 'OTHER' ? 'default' : 'outline'}
            className="w-full justify-start"
            onClick={() => {
              updateRegion('OTHER')
              setShowSelector(false)
            }}
          >
            <div className="flex items-center gap-3">
              {locationInfo?.region === 'OTHER' && (
                <Check className="w-4 h-4" />
              )}
              <div className="text-left">
                <div className="font-medium">Other (GDPR)</div>
                <div className="text-xs text-muted-foreground">
                  Full privacy controls (includes EU and rest of world)
                </div>
              </div>
            </div>
          </Button>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowSelector(false)}
          className="w-full"
        >
          Cancel
        </Button>
      </CardContent>
    </Card>
  )
}
