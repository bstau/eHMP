@F129 @VitalSignsAssociatedWithVisit  @onc

Feature: F129 - Vital Signs (write-back)

#POC: Team Pluto

    In order to validate vital signs associated with a visit
    As a clinician
    I want to be able to ensure vitals associated with a visit are presented properly

Background:
    Given user is logged into eHMP-UI
    And user searches for and selects "Eight,Patient"
    Then Cover Sheet is active
    And the "patient identifying traits" is displayed with information
        | field         | value                 |
        | patient name  | Eight,Patient      |

@VitalsAssociateWithVisit_confirm @US2821 @onc
    Scenario: Vitals Associated with the Visit Applet
    Given the vitals applet is loaded
    And the user clicks the add vitals button
    Then a modal with the title "Location for Current Activity" is displayed
    #Given the user is in the add vitals modal and clicks the change button
    When the user clicks on the Hospital Admissions header
    Then Hospital Admissions header is active 
    When the user clicks on an item under the header "7A Gen Med"
    Then Encounter Location displays "7A Gen Med"
    When the user clicks on the confirm button to confirm changes
    Then the modal title reads "Add Vital Signs"
    And Visit Information displays "7A Gen Med"
    Then the Vitals Write Back user clicks the cancel button to exit the vitals modal

@VitalsAssociateWithVisit_confirm @US2821 @onc
    Scenario: Vitals Associated with the Visit Applet where there is no visit information populated and the user enters visit information then changes it and accepts the changes
    Given the user clicks the add vitals button
    When the user clicks on the Hospital Admissions header
    Then the user clicks on an item under the header
    Then the user clicks on the confirm button to confirm changes
    Then the modal title reads "Add Vital Signs"
    Given the user clicks the change button
    When the user clicks on the Hospital Admissions header
    Then the user clicks on another item under the header
    Then the user clicks on the confirm button to confirm changes
    Then the modal title reads "Add Vital Signs"
    Then the Vitals Write Back user clicks the cancel button to exit the vitals modal

@VitalsAssociateWithVisit_cancel @US2821 @onc
    Scenario: Vitals Associated with the Visit Applet where visit is populated and user changes it
    Given the user selects a Eight,Patient visit
    Given the user clicks the add vitals button
    Then the modal title reads "Add Vital Signs"
    Given the user clicks the change button
    When the user clicks on the Hospital Admissions header
    Then the user clicks on another item under the header
    Then the user clicks on the cancel button to return to the Add Vital Signs page
    Then the Vitals Write Back user clicks the cancel button to exit the vitals modal

