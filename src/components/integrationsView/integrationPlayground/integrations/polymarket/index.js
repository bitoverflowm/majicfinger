import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

const Polymarket = ({ setConnectedData }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchEvents = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/integrations/polymarket?query=listEvents", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data?.message || "Failed to fetch Polymarket events");
        return;
      }

      setConnectedData(Array.isArray(data) ? data : [data]);
    } catch (err) {
      setError(err?.message || "Request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="text-[12px] space-y-3">
      <Button
        onClick={fetchEvents}
        disabled={loading}
        className="bg-primary hover:bg-secondary "
        size="xs"
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading…
          </>
        ) : (
          "Test pull: Get list of events"
        )}
      </Button>
      {error && (
        <p className="text-destructive text-xs">{error}</p>
      )}
    </div>
  );
};

export default Polymarket;
