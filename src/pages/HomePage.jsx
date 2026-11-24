import HeroSection from '../sections/HeroSection.jsx'
import AboutSection from '../sections/AboutSection.jsx'
import ServicesSection from '../sections/ServicesSection.jsx'
import ProcessSection from '../sections/ProcessSection.jsx'
import ProjectsSection from '../sections/ProjectsSection.jsx'
import PillarsSection from '../sections/PillarsSection.jsx'
import ContactSection from '../sections/ContactSection.jsx'

function HomePage() {
  return (
    <>
      <HeroSection />
      <div className="capabilities container" aria-label="Áreas de trabajo">
        {['Obras civiles', 'Fundaciones', 'Estructuras', 'Construcción integral'].map((item, index) => (
          <div className="capability" key={item}>
            <span className="capability-number">0{index + 1}</span>
            <span>{item}</span>
          </div>
        ))}
      </div>
      <AboutSection />
      <ServicesSection />
      <ProcessSection />
      <ProjectsSection />
      <PillarsSection />
      <ContactSection />
    </>
  )
}

export default HomePage
