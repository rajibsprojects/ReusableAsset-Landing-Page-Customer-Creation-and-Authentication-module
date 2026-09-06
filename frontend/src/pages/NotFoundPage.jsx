import { Link } from "react-router-dom";
import { ROUTES } from "@/config/site";

export default function NotFoundPage() {
  return (
    <section className="texture-paper min-h-[60vh] flex items-center" data-testid="not-found-page">
      <div className="container-x text-center py-20">
        <p className="eyebrow justify-center">404</p>
        <h1 className="heading-serif text-4xl mt-3">This page has not been stitched yet</h1>
        <p className="text-steel mt-3">The page you are looking for does not exist.</p>
        <Link to={ROUTES.home} className="btn-navy mt-8" data-testid="not-found-home-link">Back to Home</Link>
      </div>
    </section>
  );
}
