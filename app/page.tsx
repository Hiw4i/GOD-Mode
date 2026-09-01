import Image from "next/image";
import { Download, ExternalLink, Gem, Grid2X2, LayoutDashboard } from "lucide-react";
import { AmbientPlayer } from "@/components/ambient-player";
import { CruelStopwatch } from "@/components/cruel-stopwatch";
import { ModalSystem } from "@/components/modal-system";
import { MotionRuntime } from "@/components/motion-runtime";
import { PairedSceneVisual, XrayPlane } from "@/components/paired-scene-visual";
import { SpotsCounter } from "@/components/spots-counter";
import { ambientTracks, downloadPlans, features, supportMethods } from "@/lib/content";
import { APP_VERSION_LABEL } from "@/lib/version";
import { variantSrcSet, type ResponsiveImageVariant } from "@/lib/responsive-images";
import imageAssets from "@/lib/generated-image-assets.json";
import xrayPlanes from "@/lib/generated-xray-planes.json";

const featuresTitlePlane = xrayPlanes["features-title"];
const downloadTitlePlane = xrayPlanes["download-title"];
const sceneAssets = imageAssets.planes;

function ResponsivePicture({
  variants,
  className,
  alt,
  sizes,
  loading = "lazy",
  fetchPriority,
  critical = false,
}: {
  variants: readonly ResponsiveImageVariant[];
  className: string;
  alt: string;
  sizes: string;
  loading?: "eager" | "lazy";
  fetchPriority?: "high" | "low" | "auto";
  critical?: boolean;
}) {
  const fallback = variants.at(-1)!;
  return (
    <picture>
      <source type="image/webp" srcSet={variantSrcSet(variants)} sizes={sizes} />
      <Image
        className={className}
        src={fallback.src}
        alt={alt}
        width={fallback.width}
        height={fallback.height}
        sizes={sizes}
        loading={loading}
        fetchPriority={fetchPriority}
        data-site-critical={critical ? "hero" : undefined}
        unoptimized
      />
    </picture>
  );
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" stroke="none" d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  );
}

function FloatingFeatureIcons({ blurred = false }: { blurred?: boolean }) {
  const layer = blurred ? "blurred" : "sharp";
  return (
    <div className={`floating-icons${blurred ? " floating-icons--blur" : ""}`} data-icon-xray={blurred ? "blur" : "sharp"} aria-hidden="true">
      <ResponsivePicture variants={imageAssets.icons.youtube[layer]} className="float-icon float-icon--youtube" alt="" sizes="98px" />
      <ResponsivePicture variants={imageAssets.icons.tiktok[layer]} className="float-icon float-icon--tiktok" alt="" sizes="84px" />
      <ResponsivePicture variants={imageAssets.icons.instagram[layer]} className="float-icon float-icon--instagram" alt="" sizes="66px" />
    </div>
  );
}

export default function HomePage() {
  return (
    <>
      <nav aria-label="Primary navigation">
        <a href="#hero" className="nav-logo"><span className="god">GOD</span> <span className="mode">mode</span></a>
        <div className="nav-right">
          <a href="#features"><LayoutDashboard className="nav-icon" /><span className="nav-label">Features</span></a>
          <a href="#download"><Download className="nav-icon" /><span className="nav-label">Download</span></a>
          <a href="#support"><Gem className="nav-icon" /><span className="nav-label">Support</span></a>
        </div>
      </nav>

      <main>
        <section className="hero" id="hero">
          <div className="hero-content">
            <div className="hero-label">Deep Focus System</div>
            <h1 className="hero-title">GOD MODE</h1>
          </div>
          <div className="hero-statue-wrap" aria-hidden="true">
            <ResponsivePicture
              variants={imageAssets.hero.sharp}
              className="hero-statue"
              alt=""
              sizes="(max-width: 410px) 310vw, (max-width: 680px) 290vw, 140vw"
              loading="eager"
              fetchPriority="high"
              critical
            />
          </div>
        </section>

        <section className="how-it-works" id="features">
          <div className="features-stage" data-mask-stage="features" data-motion-near>
            <div className="how-it-works-bg">
              <div className="hiw-bg-label">Ready to unlock your real potential?</div>
              <div className="hiw-bg-text" data-parallax-text>
                <span className="xray-text-word">
                  <span className="xray-text-proxy">FEATURES</span>
                  <XrayPlane id="features-title" scene="features" className="xray-text-plane" sharpSources={sceneAssets["features-title"].sharp} blurredSources={sceneAssets["features-title"].blurred} width={featuresTitlePlane.width} height={featuresTitlePlane.height} contentBox={featuresTitlePlane.contentBox} targets={features.map((feature) => feature.id)} motionChannel="text" />
                </span>
              </div>
              <PairedSceneVisual
                scene="features"
                className="hiw-bg-img"
                sharpSources={sceneAssets["features-statue"].sharp}
                blurredSources={sceneAssets["features-statue"].blurred}
                width={sceneAssets["features-statue"].width}
                height={sceneAssets["features-statue"].height}
                alt="Features"
                targets={features.map((feature) => feature.id)}
              />
            </div>
            <div className="how-it-works-content">
              <div className="feature-cards">
                {features.map((feature) => {
                  const className = `feature-card feature-card-motion${feature.align === "right" ? " is-right" : ""}`;
                  if (feature.kind === "focus") {
                    return (
                      <div key={feature.id} className="total-focus-wrap feature-card-motion" data-feature-card data-speed={feature.speed} data-mask-link={feature.id} data-motion-near>
                        <div className="total-focus-motion" data-feature-id={feature.id} data-mask-target={feature.id}>
                          <FloatingFeatureIcons />
                          <article className="feature-card-surface glass-card">
                            <FloatingFeatureIcons blurred />
                            <h3>{feature.title}</h3><p>{feature.description}</p>
                          </article>
                        </div>
                      </div>
                    );
                  }
                  return (
                    <article key={feature.id} className={className} data-feature-card data-speed={feature.speed} data-mask-link={feature.id} data-motion-near>
                      <div id={feature.kind === "ambient" ? "ambientCard" : feature.kind === "timer" ? "cruelCard" : undefined} className="feature-card-surface glass-card" data-feature-id={feature.id} data-mask-target={feature.id}>
                        {feature.kind === "ambient" ? (
                          <><div className="ambient-card-copy"><h3>{feature.title}</h3><p>{feature.description}</p></div><AmbientPlayer tracks={ambientTracks} /></>
                        ) : (
                          <><h3>{feature.title}</h3><p>{feature.description}</p></>
                        )}
                        {feature.kind === "timer" && <CruelStopwatch />}
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="download-section" id="download" data-mask-stage="download" data-motion-near>
          <div className="download-bg">
            <div className="download-bg-text section-bg-text" data-parallax-text>
              <div className="download-bg-label section-bg-label">Focus is a choice</div>
              <span className="xray-text-word">
                <span className="xray-text-proxy">DOWNLOAD</span>
                <XrayPlane id="download-title" scene="download" className="xray-text-plane" sharpSources={sceneAssets["download-title"].sharp} blurredSources={sceneAssets["download-title"].blurred} width={downloadTitlePlane.width} height={downloadTitlePlane.height} contentBox={downloadTitlePlane.contentBox} targets={downloadPlans.map((plan) => `plan-${plan.id}`)} motionChannel="text" />
              </span>
            </div>
            <PairedSceneVisual
              scene="download"
              className="download-bg-img section-bg-img"
              sharpSources={sceneAssets["download-statue"].sharp}
              blurredSources={sceneAssets["download-statue"].blurred}
              width={sceneAssets["download-statue"].width}
              height={sceneAssets["download-statue"].height}
              alt="Download"
              targets={downloadPlans.map((plan) => `plan-${plan.id}`)}
            />
          </div>
          <div className="download-content">
            <div className="download-cards">
              {downloadPlans.map((plan) => (
                <article key={plan.id} className={`download-card glass-card ${plan.premium ? "premium-card" : "free-card"}`} data-mask-target={`plan-${plan.id}`}>
                  <h3 className="download-card-title">{plan.title}</h3>
                  {plan.premium ? (
                    <><p className="spots-desc">First 1000 legends get lifetime access for free</p><SpotsCounter /><div className="price-display"><span className="price-old">{plan.oldPrice}</span><span className="price-new">{plan.price}</span><span className="price-period">{plan.period}</span></div></>
                  ) : (
                    <div className="download-card-price"><span className="price-amount">{plan.price}</span></div>
                  )}
                  <ul className="download-card-features">{plan.features.map((item) => <li key={item}><span className="feature-check">{plan.premium ? "✓" : "—"}</span>{item}</li>)}</ul>
                  <a href="#download" className={`btn${plan.premium ? " download-card-btn filled" : " btn-outline"}`} data-open-modal={plan.premium ? "premium" : "download"}>{plan.premium ? <>Get Premium FOREVER<span className="arrow">→</span></> : "Download Free"}</a>
                  {!plan.premium && <div className="os-icons-row" aria-label="Available platforms"><Image src="/sources/android.png" alt="Android" width={18} height={18} /><AppleIcon /><Grid2X2 /><Image src="/sources/linux.png" alt="Linux" width={18} height={18} /></div>}
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="support-section" id="support" data-mask-stage="support" data-motion-near>
          <div className="support-bg">
            <div className="support-bg-text section-bg-text" data-parallax-text><div className="support-bg-label section-bg-label">For those who want to give more</div>SUPPORT</div>
            <PairedSceneVisual
              scene="support"
              className="support-bg-img section-bg-img"
              sharpSources={sceneAssets["support-statue"].sharp}
              blurredSources={sceneAssets["support-statue"].blurred}
              width={sceneAssets["support-statue"].width}
              height={sceneAssets["support-statue"].height}
              alt="Support"
              targets={supportMethods.map((method) => `support-${method.id}`)}
            />
          </div>
          <div className="support-content">
            <div className="support-cards">
              {supportMethods.map((method) => (
                <article key={method.id} className="support-card glass-card" data-mask-target={`support-${method.id}`}>
                  <div className={`support-card-icon ${method.id === "card" ? "rub" : "btc"}`}>{method.symbol}</div>
                  <h3 className="support-card-title">{method.title}</h3><p className="support-card-sub">{method.subtitle}</p>
                  {method.id === "card" ? <a href="https://tbank.ru/cf/1ntWnJ2SQaO" target="_blank" rel="noopener noreferrer" className="btn btn-outline">Link <ExternalLink className="btn-external-icon" /></a> : <button className="btn btn-outline" type="button" data-open-modal="crypto">View Addresses</button>}
                </article>
              ))}
            </div>
          </div>
          <a className="support-version" href="/version.json" aria-label={`GOD Mode build information, ${APP_VERSION_LABEL}`}>{APP_VERSION_LABEL}</a>
        </section>
      </main>

      <ModalSystem />
      <MotionRuntime />
    </>
  );
}
