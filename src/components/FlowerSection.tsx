import { useRef, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const WEB3FORMS_KEY = "e598fd91-5000-4293-ad81-2f314aaa0ee3";

const formSchema = z.object({
  address1: z.string().min(1, "Address is required"),
  address2: z.string().optional(),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State / Province is required"),
  postalCode: z.string().min(1, "Postal code is required"),
});

type FormValues = z.infer<typeof formSchema>;

const FlowerSection = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "start 0.4"],
  });

  const sectionOpacity = useTransform(scrollYProgress, [0, 1], [0, 1]);
  const sectionY = useTransform(scrollYProgress, [0, 1], [50, 0]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      address1: "",
      address2: "",
      city: "",
      state: "",
      postalCode: "",
    },
  });

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    try {
      const response = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          access_key: WEB3FORMS_KEY,
          subject: "Flower Request from Rain 🌹",
          from_name: "Valentine's for Rain",
          "Address Line 1": data.address1,
          "Address Line 2": data.address2 || "—",
          City: data.city,
          "State / Province": data.state,
          "Postal Code": data.postalCode,
        }),
      });

      const result = await response.json();
      if (result.success) {
        setSubmitted(true);
      } else {
        toast.error("Something went wrong", {
          description: "Please try again in a moment.",
        });
      }
    } catch {
      toast.error("Couldn't send", {
        description: "Please check your connection and try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClassName =
    "border-primary/15 bg-parchment/50 font-body tracking-wide text-ink placeholder:text-muted-foreground/50 focus-visible:ring-primary/30";

  return (
    <section
      ref={sectionRef}
      className="flex min-h-[70vh] items-center justify-center bg-background px-4 pb-28 pt-10 sm:px-6"
    >
      <motion.div
        style={{ opacity: sectionOpacity, y: sectionY }}
        className="w-full max-w-md"
      >
        <div
          className="rounded-sm bg-parchment px-7 py-10 sm:px-10 sm:py-14"
          style={{
            boxShadow:
              "0 6px 32px -10px hsl(350 40% 60% / 0.15), 0 2px 8px -3px hsl(350 30% 50% / 0.06)",
          }}
        >
          {!submitted ? (
            <>
              {/* Header */}
              <div className="mb-8 text-center">
                <p className="font-script text-2xl text-rose-deep sm:text-3xl">
                  Let pirsu buy you a flower.
                </p>
                <div className="mx-auto mt-4 h-px w-12 bg-primary/20" />
                <p className="mt-4 font-body text-sm leading-relaxed tracking-wide text-muted-foreground sm:text-base">
                  Tell me where to send it, and a bloom will find its way to you. hihi
                </p>
              </div>

              {/* Form */}
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-5"
                >
                  <FormField
                    control={form.control}
                    name="address1"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-body text-xs tracking-widest uppercase text-ink/60">
                          Address Line 1
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Street address"
                            className={inputClassName}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="address2"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-body text-xs tracking-widest uppercase text-ink/60">
                          Address Line 2
                          <span className="ml-1.5 normal-case tracking-normal text-muted-foreground/50">
                            (optional)
                          </span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Apt, suite, unit, etc."
                            className={inputClassName}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-body text-xs tracking-widest uppercase text-ink/60">
                            City
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="City"
                              className={inputClassName}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="state"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-body text-xs tracking-widest uppercase text-ink/60">
                            State / Province
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="State"
                              className={inputClassName}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="postalCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-body text-xs tracking-widest uppercase text-ink/60">
                          Postal Code
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Postal code"
                            className={inputClassName}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="pt-2">
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full font-body text-sm tracking-widest uppercase"
                      size="lg"
                    >
                      {isSubmitting ? "Sending…" : "Send"}
                    </Button>
                  </div>
                </form>
              </Form>
            </>
          ) : (
            /* Confirmation */
            <motion.div
              className="flex flex-col items-center gap-5 py-8 text-center"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <span className="text-4xl">🌹</span>
              <p className="font-script text-xl text-rose-deep sm:text-2xl">
                A flower will find its way to you.
              </p>
              <div className="mx-auto h-px w-12 bg-primary/20" />
              <p className="font-body text-sm tracking-wide text-muted-foreground">
                Thank you, Baby.
              </p>
            </motion.div>
          )}
        </div>
      </motion.div>
    </section>
  );
};

export default FlowerSection;
