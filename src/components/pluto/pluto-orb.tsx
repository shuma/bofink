'use client'

import { GrainGradient } from '@paper-design/shaders-react'

interface PlutoOrbProps {
  size?: number
}

export function PlutoOrb({ size = 32 }: PlutoOrbProps) {
  return (
    <div
      className="rounded-full overflow-hidden"
      style={{ width: size, height: size }}
    >
      <GrainGradient
        width={size}
        height={size}
        shape="sphere"
        colors={['#e8e4e0', '#d4cfc8', '#bfb8b0', '#a8a098']}
        colorBack="#fafafa"
        softness={0.9}
        intensity={0.3}
        noise={0.1}
        speed={1.5}
      />
    </div>
  )
}
