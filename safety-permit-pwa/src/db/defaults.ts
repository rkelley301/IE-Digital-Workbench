// Blank field values for new records (and for migrating older records).

import { TASK_PLANNING_FIELDS, type TaskPlanningField } from '../forms/templates'
import type { Permit, Tsti } from './types'

type PermitFormFields = Pick<
  Permit,
  'workActivities' | 'workAreas' | 'generalConsiderations' | 'hazardousConditions' | 'chemicals' | 'chemicalsOther' | 'siteConditions' | 'hotWorkTasks' | 'workConditions' | 'safetyCheck'
>

export const blankPermitFields = (): PermitFormFields => ({
  workActivities: [],
  workAreas: [],
  generalConsiderations: [],
  hazardousConditions: [],
  chemicals: [],
  chemicalsOther: '',
  siteConditions: [],
  hotWorkTasks: [],
  workConditions: [],
  safetyCheck: {},
})

type TstiFormFields = Omit<Tsti, 'id' | 'permitId' | 'date' | 'stopWorkAcknowledged' | 'stopWorkAckBy' | 'stopWorkAckAt' | 'createdAt' | 'updatedAt'>

export const blankTstiFields = (): TstiFormFields => ({
  planning: Object.fromEntries(TASK_PLANNING_FIELDS.map((f) => [f.key, ''])) as Record<TaskPlanningField, string>,
  stopWorkConditions: [],
  comments: '',
  hazardRecognition: [],
  envOther: '',
  leaderAnswers: {},
  leaderQ10: '',
  standardEquipment: '',
  specialEquipment: '',
  supportCraft: '',
  safeWorkPractices: [],
  safeWorkPracticesOther: '',
  basicSafeguards: [],
  ppeOther: '',
  glovesChemicalSpec: '',
  glovesOther: '',
  glovesOtherApprovedBy: '',
  fallProtection: [],
  fallProtectionOther: '',
  heavyEquipment: [],
  heavyEquipmentWeight: '',
  angleGrinder: { requester: '', supervisor: '', checks: [], decision: null },
  twoUpRequired: null,
  twoUpActivity: '',
})
