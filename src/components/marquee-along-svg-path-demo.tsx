import MarqueeAlongSvgPath from '@/components/ui/marquee-along-svg-path'

const path =
  'M1 209.434C58.5872 255.935 387.926 325.938 482.583 209.434C600.905 63.8051 525.516 -43.2211 427.332 19.9613C329.149 83.1436 352.902 242.723 515.041 267.302C644.752 286.966 943.56 181.94 995 156.5'

export default function MarqueeAlongSvgPathDemo() {
  return (
    <div className="w-dvw h-dvh bg-zinc-50 flex items-center justify-center">
      <MarqueeAlongSvgPath
        path={path}
        viewBox="0 0 996 330"
        baseVelocity={8}
        slowdownOnHover={true}
        draggable={true}
        repeat={2}
        dragSensitivity={0.1}
        className="w-full h-full scale-105"
        responsive
        grabCursor
      >
        {imgs.map((img, i) => (
          <div key={i} className="w-14 h-full hover:scale-150 duration-300 ease-in-out">
            <img
              src={img.src}
              alt={img.alt}
              className="w-full h-full object-cover"
              draggable={false}
              loading="lazy"
              decoding="async"
            />
          </div>
        ))}
      </MarqueeAlongSvgPath>
    </div>
  )
}

/**
 * Unsplash stock photography, requested at 200px wide because each tile renders
 * at 56px (`w-14`) and never larger than 1.5x that on hover.
 */
const img = (id: string, alt: string) => ({
  src: `https://images.unsplash.com/${id}?w=200&q=80&auto=format&fit=crop`,
  alt,
})

const imgs = [
  img('photo-1506744038136-46273834b3fb', 'Mountain lake at dusk'),
  img('photo-1511671782779-c97d3d27a1d4', 'Modern interior with soft light'),
  img('photo-1518791841217-8f162f1e1131', 'Tabby cat looking up'),
  img('photo-1493246507139-91e8fad9978e', 'Pale dunes under an open sky'),
  img('photo-1465101162946-4377e57745c3', 'Spiral staircase from below'),
  img('photo-1470071459604-3b5ec3a7fe05', 'Mist rolling through pine forest'),
  img('photo-1500534314209-a25ddb2bd429', 'Snow-covered peaks at sunrise'),
  img('photo-1441974231531-c6227db76b6e', 'Sunlight through green woodland'),
  img('photo-1447752875215-b2761acb3c5d', 'Forest path in autumn'),
  img('photo-1501785888041-af3ef285b470', 'Lake framed by mountains'),
  img('photo-1469474968028-56623f02e42e', 'Golden light over a ridge line'),
  img('photo-1426604966848-d7adac402bff', 'Green valley and river bend'),
  img('photo-1418065460487-3e41a6c84dc5', 'Rolling hills at golden hour'),
]
