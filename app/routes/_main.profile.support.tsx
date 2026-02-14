import { useState } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger, } from "~/components/ui/accordion";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { SimpleCard } from "~/components/ui/card";
import { Mail, MessageCircle, Search, Clock } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function ProfileSupport() {
  const { t } = useTranslation('profile');
  const [searchQuery, setSearchQuery] = useState("");

  const faqs = [
    {
      id: 1,
      question: t('support.faqs.trackOrder.question'),
      answer: t('support.faqs.trackOrder.answer'),
    },
    {
      id: 2,
      question: t('support.faqs.returnPolicy.question'),
      answer: t('support.faqs.returnPolicy.answer'),
    },
    {
      id: 3,
      question: t('support.faqs.partFit.question'),
      answer: t('support.faqs.partFit.answer'),
    },
    {
      id: 4,
      question: t('support.faqs.paymentMethods.question'),
      answer: t('support.faqs.paymentMethods.answer'),
    },
    {
      id: 5,
      question: t('support.faqs.shippingTime.question'),
      answer: t('support.faqs.shippingTime.answer'),
    },
  ];

  const handleStartChat = () => {
    const whatsappUrl = "https://wa.me/962793003737";
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  };

  // Filter FAQs based on search query
  const filteredFaqs = faqs.filter(
    (faq) =>
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <title>{t('support.pageTitle')}</title>
      {/* Header */}
      <div className="flex items-center gap-4 h-[37px] mb-6">
        <h1 className="text-lg font-black italic text-black tracking-[-0.198px]">
          {t('support.title')}
        </h1>
      </div>

      {/* Quick Contact Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <SimpleCard className="p-4 text-center">
          <Mail className="w-8 h-8 text-primary mx-auto mb-2" />
          <h3 className="font-semibold mb-1">{t('support.emailSupport')}</h3>
          <p className="text-sm text-gray-600 mb-3">{t('support.emailSupportDesc')}</p>
          <Button variant="outline" size="sm" className="w-full">
            support@motogt.com
          </Button>
        </SimpleCard>

        <SimpleCard className="p-4 text-center">
          <Clock className="w-8 h-8 text-primary mx-auto mb-2" />
          <h3 className="font-semibold mb-1">{t('support.supportHours')}</h3>
          <p className="text-m text-gray-600 mb-3">{t('support.supportDays')}</p>
          <Button variant="outline" size="sm" className="w-full">
          +962793003737
          </Button>
        </SimpleCard>

        <SimpleCard className="p-4 text-center">
          <MessageCircle className="w-8 h-8 text-primary mx-auto mb-2" />
          <h3 className="font-semibold mb-1">{t('support.liveChat')}</h3>
          <p className="text-sm text-gray-600 mb-3">{t('support.liveChatDesc')}</p>
          <Button size="sm" className="w-full" onClick={handleStartChat}>
            {t('support.startChat')}
          </Button>
        </SimpleCard>
      </div>

      {/* FAQ Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input
          placeholder={t('support.searchPlaceholder')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* FAQ Section */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-4">
          {t('support.frequentlyAskedQuestions')}
        </h2>
        <Accordion type="single" collapsible className="space-y-4">
          {filteredFaqs.map((faq) => (
            <AccordionItem key={faq.id} value={faq.id.toString()}>
              <AccordionTrigger className="text-left">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent>{faq.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        {filteredFaqs.length === 0 && searchQuery && (
          <div className="text-center py-8">
            <p className="text-gray-500">{t('support.noResults')}</p>
            <p className="text-sm text-gray-400 mt-2">
              {t('support.noResultsHint')}
            </p>
          </div>
        )}
      </div>

      {/* Contact Section */}
      <div className="text-sm text-muted-foreground">
        {t('support.couldntFind')}{" "}
        <button
          className="text-primary hover:underline font-medium cursor-pointer"
          onClick={handleStartChat}
        >
          {t('support.contactUsLink')}
        </button>
      </div>
    </>
  );
}
