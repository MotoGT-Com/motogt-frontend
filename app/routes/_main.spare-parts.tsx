import ShopByProductType, {
  loadShopCatalog,
  meta as shopCatalogMeta,
} from "./_main.shop.$productType";
import { SPARE_PARTS_PRODUCT_TYPE_SLUG } from "~/lib/constants";
import type { Route } from "./+types/_main.spare-parts";

export async function loader({ request }: Route.LoaderArgs) {
  return loadShopCatalog(request, SPARE_PARTS_PRODUCT_TYPE_SLUG);
}

export const meta = shopCatalogMeta;

export default function SpareParts(props: Route.ComponentProps) {
  return <ShopByProductType loaderData={props.loaderData} />;
}
