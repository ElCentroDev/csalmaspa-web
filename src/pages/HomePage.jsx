import HeroSection from '../sections/HeroSection.jsx'
import AboutSection from '../sections/AboutSection.jsx'
import ServicesSection from '../sections/ServicesSection.jsx'
import ProjectsSection from '../sections/ProjectsSection.jsx'
import PublishedProjectsSection from '../sections/PublishedProjectsSection.jsx'
import ProcessSection from '../sections/ProcessSection.jsx'
import PillarsSection from '../sections/PillarsSection.jsx'
import ContactSection from '../sections/ContactSection.jsx'

const TRUST_HIGHLIGHTS = [
  'Presupuesto cerrado',
  'Carta Gantt formal',
  'Norma sísmica NCh433',
  'Supervisión en terreno',
]

function HomePage() {
  return (
    <>
      <HeroSection />
      <div className="capabilities container" aria-label="Respaldo técnico de CSALMA">
        {TRUST_HIGHLIGHTS.map((item, index) => (
          <div className="capability" key={item}>
            <span className="capability-number">0{index + 1}</span>
            <span>{item}</span>
          </div>
        ))}
      </div>
      <AboutSection />
      <ServicesSection />
      <ProjectsSection />
      <PublishedProjectsSection />
      <ProcessSection />
      <PillarsSection />
      <ContactSection />
    </>
  )
}

export default HomePage
