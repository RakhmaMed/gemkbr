import type { DimensionMap } from './length';
import type {
	BraceletDesign,
	BraceletTemplate,
	ValidationIssue,
	ValidationResult,
} from './types';

export function validateDesign(
	design: BraceletDesign,
	template: BraceletTemplate | null,
	dimensions: DimensionMap,
): ValidationResult {
	const issues: ValidationIssue[] = [];

	if (design.schemaVersion !== 1) {
		issues.push({ code: 'unsupported_schema', message: 'Неподдерживаемая версия дизайна' });
	}

	if (!template) {
		issues.push({
			code: 'unknown_template',
			message: 'Шаблон браслета не найден',
		});
	} else {
		if (design.templateId !== template.id) {
			issues.push({ code: 'template_mismatch', message: 'Неверный шаблон браслета' });
		}
		if (
			design.targetWristMm < template.minWristMm ||
			design.targetWristMm > template.maxWristMm
		) {
			issues.push({
				code: 'wrist_out_of_range',
				message: `Размер запястья должен быть от ${template.minWristMm} до ${template.maxWristMm} мм`,
			});
		}
	}

	const seenIds = new Set<string>();
	for (const item of design.items) {
		if (seenIds.has(item.id)) {
			issues.push({
				code: 'duplicate_item_id',
				message: 'Дублирующийся идентификатор элемента',
				itemId: item.id,
			});
		}
		seenIds.add(item.id);

		const dim = dimensions.get(item.variantId);
		if (!dim) {
			issues.push({
				code: 'unknown_variant',
				message: 'Неизвестный компонент',
				itemId: item.id,
				variantId: item.variantId,
			});
			continue;
		}
		if (!dim.active) {
			issues.push({
				code: 'inactive_variant',
				message: 'Компонент недоступен',
				itemId: item.id,
				variantId: item.variantId,
			});
		}
	}

	return { ok: issues.length === 0, issues };
}
