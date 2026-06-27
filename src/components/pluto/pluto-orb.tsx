'use client'

import { GrainGradient } from '@paper-design/shaders-react'

const COLOR_SCHEMES = {
  dia: ['#0358F7', '#FFD400', '#FA3D1D', '#FD02F5'],
  pluto: ['#e8e4e0', '#d4cfc8', '#bfb8b0', '#a8a098'],
} as const

type ColorScheme = keyof typeof COLOR_SCHEMES

interface PlutoOrbProps {
  size?: number
  speed?: number
  scheme?: ColorScheme
}

export function PlutoOrb({ size = 32, speed = 1.5, scheme = 'dia' }: PlutoOrbProps) {
  return (
    <div
      className="rounded-full overflow-hidden"
      style={{ width: size, height: size }}
    >
      <GrainGradient
        width={size}
        height={size}
        shape="sphere"
        colors={COLOR_SCHEMES[scheme]}
        colorBack="#fafafa"
        softness={0.9}
        intensity={0.3}
        noise={0.1}
        speed={speed}
      />
    </div>
  )
}
