import { Link, href } from "react-router";
import { useTranslation } from "react-i18next";

export default function RefundPolicy() {
  const { t } = useTranslation("common");

  return (
    <>
      <title>{t("refundPolicy.pageTitle")}</title>
      <article className="prose prose-sm md:prose-base prose-headings:font-koulen mx-auto my-10 md:my-18 px-6">
        <h1>{t("refundPolicy.title")}</h1>
        <p>
          {t("refundPolicy.effectiveDateLabel")}: {t("refundPolicy.effectiveDate")}
        </p>
        <p>{t("refundPolicy.intro")}</p>

        <section>
          <h2>{t("refundPolicy.eligibility.title")}</h2>
          <p>{t("refundPolicy.eligibility.description")}</p>
          <ul>
            <li>{t("refundPolicy.eligibility.items.0")}</li>
            <li>{t("refundPolicy.eligibility.items.1")}</li>
            <li>{t("refundPolicy.eligibility.items.2")}</li>
            <li>{t("refundPolicy.eligibility.items.3")}</li>
          </ul>
        </section>

        <section>
          <h2>{t("refundPolicy.process.title")}</h2>
          <ol>
            <li>{t("refundPolicy.process.steps.0")}</li>
            <li>{t("refundPolicy.process.steps.1")}</li>
            <li>{t("refundPolicy.process.steps.2")}</li>
            <li>{t("refundPolicy.process.steps.3")}</li>
          </ol>
          <p>{t("refundPolicy.process.note")}</p>
        </section>

        <section>
          <h2>{t("refundPolicy.nonRefundable.title")}</h2>
          <ul>
            <li>{t("refundPolicy.nonRefundable.items.0")}</li>
            <li>{t("refundPolicy.nonRefundable.items.1")}</li>
            <li>{t("refundPolicy.nonRefundable.items.2")}</li>
            <li>{t("refundPolicy.nonRefundable.items.3")}</li>
          </ul>
        </section>

        <section>
          <h2>{t("refundPolicy.exchanges.title")}</h2>
          <p>{t("refundPolicy.exchanges.description")}</p>
        </section>

        <section>
          <h2>{t("refundPolicy.damaged.title")}</h2>
          <p>{t("refundPolicy.damaged.description")}</p>
        </section>

        <section>
          <h2>{t("refundPolicy.cancellations.title")}</h2>
          <p>{t("refundPolicy.cancellations.description")}</p>
        </section>

        <section>
          <h2>{t("refundPolicy.questions.title")}</h2>
          <p>
            {t("refundPolicy.questions.descriptionPrefix")}{" "}
            <a href="mailto:support@motogt.com">support@motogt.com</a>{" "}
            {t("refundPolicy.questions.descriptionMiddle")}{" "}
            <Link to={href("/profile/support")}>
              {t("refundPolicy.questions.helpCenter")}
            </Link>
            .
          </p>
        </section>

        <p>{t("refundPolicy.closing")}</p>
      </article>
    </>
  );
}

