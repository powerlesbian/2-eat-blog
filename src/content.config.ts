import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blogSchema = ({ image }: { image: () => z.ZodType }) =>
	z.object({
		title: z.string(),
		description: z.string(),
		pubDate: z.coerce.date(),
		updatedDate: z.coerce.date().optional(),
		heroImage: image().optional(),
	});

const blog = defineCollection({
	loader: glob({ base: './src/content/blog', pattern: '**/*.{md,mdx}' }),
	schema: blogSchema,
});

const blogZhHant = defineCollection({
	loader: glob({ base: './src/content/blog-zh-hant', pattern: '**/*.{md,mdx}' }),
	schema: blogSchema,
});

const blogZhHans = defineCollection({
	loader: glob({ base: './src/content/blog-zh-hans', pattern: '**/*.{md,mdx}' }),
	schema: blogSchema,
});

const blogAr = defineCollection({
	loader: glob({ base: './src/content/blog-ar', pattern: '**/*.{md,mdx}' }),
	schema: blogSchema,
});

export const collections = { blog, 'blog-zh-hant': blogZhHant, 'blog-zh-hans': blogZhHans, 'blog-ar': blogAr };
