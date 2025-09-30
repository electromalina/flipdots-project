export default function About() {
  return (
    <section id="about" className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <div>
            <h2 className="font-heading text-4xl sm:text-5xl font-bold mb-6">
              ABOUT FLIPDOTS
            </h2>
            <div className="space-y-4 font-body text-foreground/80">
              <p>
                Flip-dot displays combine the nostalgia of mechanical signage with modern digital control systems. Each dot is a physical disc that flips between two colors, creating a unique aesthetic that stands out in our increasingly digital world.
              </p>
              <p>
                Originally developed for transportation signage in the 1950s, flip-dot technology has evolved into a versatile display solution perfect for art installations, retail displays, information boards, and creative projects.
              </p>
              <p>
                Our mission is to make this fascinating technology accessible to creators, businesses, and enthusiasts who want to add a touch of mechanical beauty to their digital experiences.
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 mt-8">
              <div>
                <div className="font-heading text-3xl font-bold text-primary">
                  50+
                </div>
                <div className="font-body text-sm text-foreground/70">
                  Projects Completed
                </div>
              </div>
              <div>
                <div className="font-heading text-3xl font-bold text-primary">
                  10M+
                </div>
                <div className="font-body text-sm text-foreground/70">
                  Flips Per Day
                </div>
              </div>
              <div>
                <div className="font-heading text-3xl font-bold text-primary">
                  99.9%
                </div>
                <div className="font-body text-sm text-foreground/70">
                  Uptime
                </div>
              </div>
            </div>
          </div>

          {/* Visual Element */}
          <div className="relative">
            <div className="aspect-square bg-foreground/5 rounded-lg flex items-center justify-center">
              <div className="grid grid-cols-7 gap-3 p-8">
                {Array.from({ length: 49 }).map((_, i) => (
                  <div
                    key={i}
                    className={`aspect-square rounded-full ${
                      Math.random() > 0.5 ? "bg-primary" : "bg-foreground/20"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
