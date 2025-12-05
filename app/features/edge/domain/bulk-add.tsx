import { bulkDomainsSchema } from '@/resources/schemas/domain.schema';
import { Button } from '@datum-ui/components';
import { Form } from '@datum-ui/components/new-form';
import { Popover, PopoverContent, PopoverTrigger } from '@shadcn/ui/popover';
import { ArrowRightIcon, ListChecksIcon } from 'lucide-react';
import { useState } from 'react';

export const BulkAddDomainsAction = () => {
  const [popoverOpen, setPopoverOpen] = useState(false);
  return (
    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
      <PopoverTrigger asChild>
        <Button
          htmlType="button"
          type="secondary"
          theme="outline"
          size="small"
          className="border-secondary/20 hover:border-secondary">
          <ListChecksIcon className="size-4" />
          Bulk add domains
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 space-y-4 rounded-xl p-7">
        <div className="space-y-3">
          <h2 className="text-sm font-semibold">Bulk Add Domains</h2>
          <p className="text-xs">Paste a list of domains you wish to add below, one per line.</p>
        </div>

        <Form.Root
          schema={bulkDomainsSchema}
          onSubmit={async (data) => {
            console.log(data.domains);
          }}
          className="space-y-4">
          <Form.Field name="domains" required>
            <Form.Textarea
              placeholder={'example.com\nexample.org\nexample.net'}
              className="h-48 resize-none"
            />
          </Form.Field>
          <Form.Submit
            icon={<ArrowRightIcon className="size-4" />}
            iconPosition="right"
            type="secondary"
            theme="solid"
            size="small"
            htmlType="submit">
            Add domains
          </Form.Submit>
        </Form.Root>
      </PopoverContent>
    </Popover>
  );
};
