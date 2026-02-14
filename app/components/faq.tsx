import { useTranslation } from "react-i18next";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger, } from "./ui/accordion";

export function Faq() {
  const { t } = useTranslation("common");
  const faqItems = t("faq.items", { returnObjects: true }) as Array<{
    question: string;
    answer: string;
  }>;

  // Ensure faqItems is an array
  const items = Array.isArray(faqItems) ? faqItems : [];

  return (
    <section className="max-w-4xl mx-auto px-6 py-16">
      <div className="text-center mb-8">
        <h2 className="text-2xl md:text-5xl font-bold md:mb-2">
          {t("faq.title")}
        </h2>
        <h2 className="text-2xl md:text-5xl font-bold text-primary">
          {t("faq.subtitle")}
        </h2>
      </div>

      <Accordion type="single" collapsible className="space-y-4">
        {items.map((faq, index) => (
          <AccordionItem
            key={index}
            value={`item-${index}`}
            className="bg-white hover:bg-white/80"
          >
            <AccordionTrigger>{faq.question}</AccordionTrigger>
            <AccordionContent>{faq.answer}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
