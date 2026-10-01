import { bulkDomainsSchema, parseDomains } from '@/resources/domains';
import { readFileAsText } from '@/utils/common';
import { parseDomainsFromFile } from '@/utils/helpers/parse.helper';
import { FileInputButton } from '@datum-cloud/datum-ui/dropzone';
import { Form, useWatch } from '@datum-cloud/datum-ui/form';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { toast } from '@datum-cloud/datum-ui/toast';
import { Text, Title } from '@datum-cloud/datum-ui/typography';
import { cn } from '@datum-cloud/datum-ui/utils';
import { ArrowRightIcon } from 'lucide-react';

type AddDomainsFormLayout = 'dialog' | 'page';

const AddDomainsSubmitButton = ({ layout }: { layout: AddDomainsFormLayout }) => {
  const domains = useWatch('domains') as string | undefined;
  const domainsCount = domains ? parseDomains(domains).length : 0;

  return (
    <Form.Submit
      icon={<Icon icon={ArrowRightIcon} className="size-4" />}
      iconPosition="right"
      type={layout === 'dialog' ? 'secondary' : 'primary'}
      theme="solid"
      size={layout === 'dialog' ? 'small' : undefined}
      htmlType="submit"
      disabled={domainsCount === 0}>
      {domainsCount > 0
        ? `Add ${domainsCount === 1 ? 'domain' : 'domains'} (${domainsCount})`
        : 'Add domains'}
    </Form.Submit>
  );
};

/**
 * The add-domains form shared by the Domains list dialog and the add-domain
 * page: domains typed one per line or comma-separated, or read from a CSV
 * file. A chosen CSV file submits straight away.
 */
export function AddDomainsForm({
  onSubmitDomains,
  layout,
}: {
  onSubmitDomains: (domains: string[]) => Promise<void>;
  layout: AddDomainsFormLayout;
}) {
  const handleFileSelect = async (files: File[]) => {
    const file = files[0];
    if (!file) return;

    try {
      const content = await readFileAsText(file);
      const domainsRaw = parseDomainsFromFile(content);
      const result = bulkDomainsSchema.safeParse({ domains: domainsRaw.join('\n') });

      if (!result.success) {
        toast.error('Domains', {
          description: result.error.issues[0]?.message || 'Invalid domains in file',
        });
        return;
      }

      await onSubmitDomains(result.data.domains);
    } catch {
      toast.error('Domains', { description: 'Failed to read file' });
    }
  };

  const csvButton = (
    <FileInputButton
      htmlType="button"
      accept={{ 'text/csv': ['.csv'] }}
      type="quaternary"
      theme="outline"
      size="small"
      onFileSelect={handleFileSelect}
      onFileError={(error) => toast.error('Domains', { description: error.message })}>
      Choose CSV file
    </FileInputButton>
  );

  const isPage = layout === 'page';

  return (
    <div className={cn(isPage ? 'flex flex-col gap-6' : 'space-y-4')}>
      <Form.Root
        schema={bulkDomainsSchema}
        mode="onSubmit"
        onSubmit={(data: { domains: string[] }) => onSubmitDomains(data.domains)}
        className={cn(isPage ? 'flex flex-col gap-6' : 'space-y-4')}>
        <Form.Field
          name="domains"
          label={isPage ? 'Domain names' : undefined}
          description={isPage ? 'One per line, or separated by commas.' : undefined}
          required>
          <Form.Textarea
            placeholder={'example.com, example.org\nexample.net'}
            className={cn(isPage ? 'h-56' : 'h-48', 'resize-none')}
            autoFocus={isPage}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            data-e2e="add-domains-input"
          />
        </Form.Field>
        {isPage ? (
          <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              {csvButton}
              <Text as="span" size="xs" textColor="muted">
                Or import a list from a CSV file.
              </Text>
            </div>
            <AddDomainsSubmitButton layout={layout} />
          </div>
        ) : (
          <AddDomainsSubmitButton layout={layout} />
        )}
      </Form.Root>

      {!isPage && (
        <div className="mt-6 space-y-4">
          <Title as="h2" level={7} weight="semibold">
            Import from file
          </Title>
          {csvButton}
        </div>
      )}
    </div>
  );
}
