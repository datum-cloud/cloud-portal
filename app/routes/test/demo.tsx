import BadgeDemo, { badgeDemoSections } from '@/components/demo/badge';
import ButtonDemo, { buttonDemoSections } from '@/components/demo/button';
import StatusBadgeDemo, { statusBadgeDemoSections } from '@/components/demo/status-badge';
import TooltipDemo, { tooltipDemoSections } from '@/components/demo/tooltip';
import { Button } from '@datum-ui/components';
import { Tooltip } from '@datum-ui/components';
import { cn } from '@shadcn/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@shadcn/ui/collapsible';
import { ChevronRight, Moon, Sun, ChevronsUpDown } from 'lucide-react';
import { useState, useEffect } from 'react';

// Auto-generate navigation from demo components
// Just add your component here and it will automatically appear in navigation!
const demoComponents = [
  { name: 'Button', sections: buttonDemoSections, Component: ButtonDemo },
  { name: 'Badge', sections: badgeDemoSections, Component: BadgeDemo },
  { name: 'StatusBadge', sections: statusBadgeDemoSections, Component: StatusBadgeDemo },
  { name: 'Tooltip', sections: tooltipDemoSections, Component: TooltipDemo },
];

export default function Demo() {
  const [activeSection, setActiveSection] = useState<string>(
    demoComponents[0]?.sections[0]?.id || ''
  );
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>({});

  // Dark mode toggle (preview only, doesn't persist)
  useEffect(() => {
    const originalHasDark = document.documentElement.classList.contains('dark');

    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Restore original state on unmount
    return () => {
      if (originalHasDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };
  }, [isDarkMode]);

  // Scroll tracking for active section
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 100;

      for (const component of demoComponents) {
        for (const section of component.sections) {
          const element = document.getElementById(section.id);
          if (element) {
            const { offsetTop, offsetHeight } = element;
            if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
              setActiveSection(section.id);
              break;
            }
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Check initial position
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const yOffset = -80;
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
      setActiveSection(id);
    }
  };

  const toggleAccordion = (componentName: string) => {
    setOpenAccordions((prev) => ({
      ...prev,
      [componentName]: !prev[componentName],
    }));
  };

  const toggleAllAccordions = () => {
    // Check if all accordions are currently open
    const allOpen = demoComponents.every((component) => openAccordions[component.name] === true);

    // Toggle: if all are open, close them all; otherwise, open them all
    const newState: Record<string, boolean> = {};
    demoComponents.forEach((component) => {
      newState[component.name] = !allOpen;
    });
    setOpenAccordions(newState);
  };

  const areAllOpen = demoComponents.every((component) => openAccordions[component.name] === true);

  return (
    <div className="flex min-h-screen">
      {/* Sidebar Navigation */}
      <aside className="bg-background sticky top-0 h-screen w-64 border-r p-4">
        <div className="mb-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Component Demos</h2>
            <div className="flex gap-1">
              <Tooltip message={areAllOpen ? 'Collapse all' : 'Expand all'}>
                <Button
                  type="tertiary"
                  theme="borderless"
                  size="icon"
                  onClick={toggleAllAccordions}
                  className="h-8 w-8">
                  <ChevronsUpDown className="h-4 w-4" />
                </Button>
              </Tooltip>
              <Tooltip message={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}>
                <Button
                  type="tertiary"
                  theme="borderless"
                  size="icon"
                  onClick={() => setIsDarkMode(!isDarkMode)}
                  className="h-8 w-8">
                  {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </Button>
              </Tooltip>
            </div>
          </div>
          <p className="text-muted-foreground text-sm">Navigate to sections</p>
        </div>
        <div className="h-[calc(100vh-6rem)] overflow-y-auto">
          <nav className="space-y-2">
            {demoComponents.map((component) => (
              <Collapsible
                key={component.name}
                open={openAccordions[component.name] || false}
                onOpenChange={() => toggleAccordion(component.name)}
                className="group">
                <CollapsibleTrigger asChild>
                  <Button
                    type="tertiary"
                    theme="borderless"
                    className="text-muted-foreground group-data-[state=open]:text-foreground hover:bg-accent mb-1 w-full justify-between text-sm font-semibold">
                    <span>{component.name}</span>
                    <ChevronRight className="h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-90" />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <ul className="space-y-1 pl-2">
                    {component.sections.map((section) => (
                      <li key={section.id}>
                        <Button
                          type="tertiary"
                          theme="borderless"
                          className={cn(
                            'w-full justify-start text-left text-sm',
                            activeSection === section.id &&
                              'bg-accent text-accent-foreground font-medium'
                          )}
                          onClick={() => scrollToSection(section.id)}>
                          {section.label}
                        </Button>
                      </li>
                    ))}
                  </ul>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1">
        <div className="space-y-8 p-6">
          {demoComponents.map((component) => (
            <component.Component key={component.name} />
          ))}
        </div>
      </main>
    </div>
  );
}
